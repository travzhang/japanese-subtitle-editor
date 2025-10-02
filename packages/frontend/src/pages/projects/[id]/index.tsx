import {useParams} from "react-router-dom";

const ProjectDetail = () => {
  const projectID= useParams()
  return <div>
    <video src={'http://192.168.3.52:3000/public/app/f7979606eb56f96f0f2f1f792cf7f2dcc8fbce01eda89db0d0dd2488413ce1b5.mp4'}/>

    <div>
      右边
    </div>
  </div>
}

export default ProjectDetail
